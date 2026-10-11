package com.ecommerce.project.controller;

import com.ecommerce.project.config.AppConstants;
import com.ecommerce.project.payload.AuthenticationResult;
import com.ecommerce.project.repositories.RoleRepository;
import com.ecommerce.project.repositories.UserRepository;
import com.ecommerce.project.security.jwt.JwtUtils;
import com.ecommerce.project.security.request.LoginRequest;
import com.ecommerce.project.security.request.SignupRequest;
import com.ecommerce.project.security.response.MessageResponse;
import com.ecommerce.project.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    AuthenticationConfiguration authenticationConfiguration;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    AuthService authService;

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) throws Exception {
        AuthenticationResult result = authService.login(loginRequest);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, result.getJwtCookie().toString()).body(result.getResponse());
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signupRequest) {
        return authService.register(signupRequest);
    }

    @GetMapping("/username")
    public String currentUserName(Authentication authentication) {
        if (authentication != null) {
            return authentication.getName();
        } else {
            return "";
        }
    }

    @GetMapping("/user")
    public ResponseEntity<?> getUserDetail(Authentication authentication) {
        return ResponseEntity.ok().body(authService.getCurrentUserDetails(authentication));
    }

    @PostMapping("/signout")
    public ResponseEntity<?> signoutUser() {
        ResponseCookie cookie = authService.logoutUser();
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new MessageResponse("You've been signed out!"));
    }

    @GetMapping("/sellers")
    public ResponseEntity<?> getAllSellers(
            @RequestParam(name = "pageNumber", defaultValue = AppConstants.PAGE_NUMBER, required = false) Integer pageNumber) {

        Sort sortByAndOrder = Sort.by(AppConstants.SORT_USERS_BY).descending();
        Pageable pageDetails = PageRequest.of(pageNumber ,
                Integer.parseInt(AppConstants.PAGE_SIZE), sortByAndOrder);

        return ResponseEntity.ok(authService.getAllSellers(pageDetails));
    }
}
