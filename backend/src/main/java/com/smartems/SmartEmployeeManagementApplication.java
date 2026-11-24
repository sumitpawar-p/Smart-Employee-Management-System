package com.smartems;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SmartEmployeeManagementApplication {

    public static void main(String[] args) {

        SpringApplication.run(
            SmartEmployeeManagementApplication.class, args
        );

        System.out.println("Smart Employee Management Started!");
    }
}